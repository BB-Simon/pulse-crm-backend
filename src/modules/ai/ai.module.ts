import Anthropic from '@anthropic-ai/sdk';
import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ANTHROPIC_CLIENT } from './anthropic-client.token';

@Module({
  providers: [
    {
      provide: ANTHROPIC_CLIENT,
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        // Falls back to a placeholder so DI can construct the client even when
        // Claude isn't configured; consumers check ANTHROPIC_API_KEY themselves
        // and fail fast with a clear error before this client is ever called.
        const apiKey =
          configService.get<string>('ANTHROPIC_API_KEY') ||
          'sk-ant-not-configured';
        return new Anthropic({ apiKey });
      },
    },
  ],
  exports: [ANTHROPIC_CLIENT],
})
export class AiModule {}
