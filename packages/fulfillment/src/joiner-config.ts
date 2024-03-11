import { Modules } from "@medusajs/modules-sdk"
import { ModuleJoinerConfig } from "@medusajs/types"
import { MapToConfig } from "@medusajs/utils"
import ShippingOption from "./models/shipping-option"

// TODO manage the config

export const LinkableKeys: Record<string, string> = {
  shipping_option_id: ShippingOption.name,
}

const entityLinkableKeysMap: MapToConfig = {}
Object.entries(LinkableKeys).forEach(([key, value]) => {
  entityLinkableKeysMap[value] ??= []
  entityLinkableKeysMap[value].push({
    mapTo: key,
    valueFrom: key.split("_").pop()!,
  })
})

export const entityNameToLinkableKeysMap: MapToConfig = entityLinkableKeysMap

export const joinerConfig: ModuleJoinerConfig = {
  serviceName: Modules.FULFILLMENT,
  primaryKeys: ["id"],
  linkableKeys: LinkableKeys,
  alias: [
    {
      name: ["shipping_option", "shipping_options"],
      args: {
        entity: ShippingOption.name,
      },
    },
  ],
} as ModuleJoinerConfig
