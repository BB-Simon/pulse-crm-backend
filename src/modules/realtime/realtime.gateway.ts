import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import {
  OnGatewayConnection,
  OnGatewayDisconnect,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server as BaseServer, Socket as BaseSocket } from 'socket.io';
import { JwtPayload } from '../auth/types/jwt-payload.interface';
import {
  DEAL_STAGE_CHANGED_EVENT,
  DealStageChangedEvent,
} from './realtime.types';

interface RealtimeSocketData {
  organizationId: string;
  userId: string;
}

interface RealtimeEmitEvents {
  error: (payload: { message: string }) => void;
  [DEAL_STAGE_CHANGED_EVENT]: (payload: DealStageChangedEvent) => void;
}

type Socket = BaseSocket<
  Record<string, never>,
  RealtimeEmitEvents,
  Record<string, never>,
  RealtimeSocketData
>;

type Server = BaseServer<
  Record<string, never>,
  RealtimeEmitEvents,
  Record<string, never>,
  RealtimeSocketData
>;

function organizationRoom(organizationId: string): string {
  return `org:${organizationId}`;
}

/**
 * Broadcasts CRM domain events to connected clients, scoped per organization
 * via socket.io rooms. Clients authenticate with the same JWT used for the
 * REST API, passed as `auth.token` in the socket.io handshake; CORS is left
 * permissive here since the token — not the origin — is the access control.
 */
@WebSocketGateway({
  namespace: '/realtime',
  cors: { origin: true, credentials: true },
})
export class RealtimeGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  private readonly logger = new Logger(RealtimeGateway.name);

  @WebSocketServer()
  server: Server;

  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  async handleConnection(client: Socket): Promise<void> {
    const token = this.extractToken(client);
    if (!token) {
      this.reject(client, 'Missing authentication token');
      return;
    }

    try {
      const payload = await this.jwtService.verifyAsync<JwtPayload>(token, {
        secret: this.configService.get<string>('JWT_SECRET'),
      });
      client.data.organizationId = payload.organizationId;
      client.data.userId = payload.sub;
      await client.join(organizationRoom(payload.organizationId));
      this.logger.debug(
        `Client ${client.id} connected (org ${payload.organizationId})`,
      );
    } catch {
      this.reject(client, 'Invalid or expired token');
    }
  }

  handleDisconnect(client: Socket): void {
    this.logger.debug(`Client ${client.id} disconnected`);
  }

  broadcastDealStageChanged(
    organizationId: string,
    event: DealStageChangedEvent,
  ): void {
    this.server
      .to(organizationRoom(organizationId))
      .emit(DEAL_STAGE_CHANGED_EVENT, event);
  }

  private extractToken(client: Socket): string | undefined {
    const authToken = client.handshake.auth?.token as string | undefined;
    if (authToken) return authToken;

    const header = client.handshake.headers.authorization;
    const [type, token] = header?.split(' ') ?? [];
    return type === 'Bearer' ? token : undefined;
  }

  private reject(client: Socket, reason: string): void {
    client.emit('error', { message: reason });
    client.disconnect(true);
  }
}
