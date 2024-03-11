import { ModuleRegistrationName } from "@medusajs/modules-sdk"
import { IPricingModuleService } from "@medusajs/types"
import {
  ContainerRegistrationKeys,
  MedusaError,
  remoteQueryObjectFromString,
} from "@medusajs/utils"
import { StepResponse, createStep } from "@medusajs/workflows-sdk"

interface StepInput {
  optionIds: string[]
  context?: Record<string, unknown>
}

export const getShippingOptionPriceSetsStepId = "get-variant-price-sets"
export const getShippingOptionPriceSetsStep = createStep(
  getShippingOptionPriceSetsStepId,
  async (data: StepInput, { container }) => {
    if (!data.optionIds.length) {
      return new StepResponse({})
    }

    const pricingModuleService = container.resolve<IPricingModuleService>(
      ModuleRegistrationName.PRICING
    )

    const remoteQuery = container.resolve(
      ContainerRegistrationKeys.REMOTE_QUERY
    )

    const query = remoteQueryObjectFromString({
      entryPoint: "shippin_option_price_set",
      fields: ["id", "shipping_option_id", "price_set_id"],
      variables: {
        shipping_option_id: data.optionIds,
      },
    })

    const optionPriceSets = await remoteQuery(query)

    const notFound: string[] = []
    const priceSetIds: string[] = []

    optionPriceSets.forEach((v) => {
      if (v.price?.price_set_id) {
        priceSetIds.push(v.price.price_set_id)
      } else {
        notFound.push(v.id)
      }
    })

    if (notFound.length) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        `Shipping options with IDs ${notFound.join(", ")} do not have a price`
      )
    }

    const calculatedPriceSets = await pricingModuleService.calculatePrices(
      { id: priceSetIds },
      { context: data.context as Record<string, string | number> }
    )

    const idToPriceSet = new Map<string, Record<string, any>>(
      calculatedPriceSets.map((p) => [p.id, p])
    )

    const optionToCalculatedPriceSets = optionPriceSets.reduce(
      (acc, { id, price }) => {
        const calculatedPriceSet = idToPriceSet.get(price?.price_set_id)
        if (calculatedPriceSet) {
          acc[id] = calculatedPriceSet
        }

        return acc
      },
      {}
    )

    return new StepResponse(optionToCalculatedPriceSets)
  }
)
