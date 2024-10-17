import { hyphenate, Session } from "koishi"
import { MCCBot } from "./bot"
import * as MCC from "./types"

export * from "./adapter"
export * from "./bot"
export { MCC }
export default MCCBot

declare module "@satorijs/core" {
  interface Session {
    mcc?: MCC.Internal & MCC.Payload
  }
}

type MCCEvents = {
  [K in Exclude<keyof MCC.Events, MCC.ConvertedEvents> as K extends `On${infer N}`
    ? `mcc/${hyphenate<Uncapitalize<N>>}`
    : never]: (session: Session & { mcc: MCC.Payload<K> }) => void
}
declare module "koishi" {
  interface Events extends MCCEvents {}
}
