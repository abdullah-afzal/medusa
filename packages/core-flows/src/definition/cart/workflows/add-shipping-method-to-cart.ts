import { CartDTO } from "@medusajs/types"
import {
  WorkflowData,
  createWorkflow,
  transform,
} from "@medusajs/workflows-sdk"
import { useRemoteQueryStep } from "../../../common/steps/use-remote-query"
import { addShippingMethodToCartStep } from "../steps"
import { getShippingOptionPriceSetsStep } from "../steps/get-shipping-option-price-sets"
import { refreshCartPromotionsStep } from "../steps/refresh-cart-promotions"

interface AddShippingMethodToCartWorkflowInput {
  cart: CartDTO
  options: {
    id: string
    data?: Record<string, unknown>
  }[]
}

export const addShippingMethodToCartWorkflowId = "add-shipping-method-to-cart"
export const addShippingMethodToWorkflow = createWorkflow(
  addShippingMethodToCartWorkflowId,
  (
    input: WorkflowData<AddShippingMethodToCartWorkflowInput>
  ): WorkflowData<void> => {
    const pricingContext = transform({ input }, (data) => {
      return {
        currency_code: data.input.cart.currency_code,
      }
    })

    const optionIds = transform({ input }, (data) => {
      return (data.input.options ?? []).map((i) => i.id)
    })

    const priceSets = getShippingOptionPriceSetsStep({
      optionIds: optionIds,
      context: pricingContext,
    })

    const shippingOptions = useRemoteQueryStep({
      entry_point: "shipping_option",
      fields: ["id"],
      variables: {
        id: optionIds,
      },
    })

    const shippingMethodInput = transform(
      { priceSets, input, shippingOptions },
      (data) => {
        const options = (data.input.options ?? []).map((option) => {
          const shippingOption = data.shippingOptions.find(
            (so) => so.id === option.id
          )!

          const price = data.priceSets[option.id].calculated_amount

          return {
            shipping_option_id: shippingOption.id,
            amount: price,
            data: option.data,
            name: shippingOption.name,
            cart_id: data.input.cart.id,
          }
        })

        return options
      }
    )

    addShippingMethodToCartStep({ shipping_methods: shippingMethodInput })
    refreshCartPromotionsStep({ id: input.cart.id })
  }
)
