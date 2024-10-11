import { Adapter, Bot, Context, Schema, Time } from "koishi"
import MCCAdapter from "./adapter"
import { Internal } from "./internal"
import { WsClient } from "./ws"

export class MCCBot<
  C extends Context,
  T extends MCCBot.Config = MCCBot.Config
> extends Bot<C, T> {
  constructor(ctx: C, config: T) {
    super(ctx, config)
    this.internal = new Internal(this)
    this.platform = "minecraft"
    ctx.plugin(WsClient, this.config)
  }

  async initialize() {
    await this.getLogin()
  }
}

export namespace MCCBot {
  export interface Config extends Adapter.WsClientConfig {
    endpoint: string
    mccPassword: string
    mccSessionId: string
    channelId: string
    responseTimeout: number
    logEventTypes: string[]
  }
  export const Config: Schema<Config> = Schema.intersect([
    Schema.object({
      endpoint: Schema.string()
        .role("url")
        .default("ws://127.0.0.1:8043")
        .description("要连接的 WebSocketBot 地址。"),
      mccPassword: Schema.string()
        .role("password")
        .default("wspass12345")
        .description("WebSocketBot 身份验证密码。"),
      mccSessionId: Schema.string()
        .default("koishi")
        .description("WebSocketBot 会话 ID。"),
      channelId: Schema.string().default("0").description("报告给 Koishi 的频道 ID。"),
    }),
    Adapter.WsClientConfig,
    Schema.object({
      responseTimeout: Schema.natural()
        .role("time")
        .default(Time.minute)
        .description("等待响应的时间 (单位为毫秒)。"),
    }),
    Schema.object({
      logEventTypes: Schema.array(
        Schema.union([
          "foo",
          "bar",
          Schema.const("_default").required().description("其他 "),
        ])
      )
        .role("select")
        .default([])
        .description("要记录调试日志的事件类型。"),
    }).description("调试设置"),
  ])
}
