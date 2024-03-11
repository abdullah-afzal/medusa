import { ModuleRegistrationName, Modules } from "@medusajs/modules-sdk"
import {
  IFulfillmentModuleService,
  IPricingModuleService,
} from "@medusajs/types"
import { ContainerRegistrationKeys } from "@medusajs/utils"
import { medusaIntegrationTestRunner } from "medusa-test-utils"

jest.setTimeout(50000)

const env = { MEDUSA_FF_MEDUSA_V2: true }

medusaIntegrationTestRunner({
  env,
  testSuite: ({ getContainer }) => {
    describe("Region and Payment Providers", () => {
      let appContainer
      let fulfillmentModule: IFulfillmentModuleService
      let pricingModule: IPricingModuleService
      let remoteQuery
      let remoteLink

      beforeAll(async () => {
        appContainer = getContainer()
        fulfillmentModule = appContainer.resolve(
          ModuleRegistrationName.FULFILLMENT
        )
        pricingModule = appContainer.resolve(ModuleRegistrationName.PRICING)
        remoteQuery = appContainer.resolve(
          ContainerRegistrationKeys.REMOTE_QUERY
        )
        remoteLink = appContainer.resolve(ContainerRegistrationKeys.REMOTE_LINK)
      })

      it("should query shipping option and price set link with remote query", async () => {
        const shippingOption = await fulfillmentModule.createShippingOptions({
          name: "Test shipping option",
          service_zone_id: "sz_1234",
          shipping_profile_id: "sp_1234",
          service_provider_id: "test-provider",
          price_type: "flat",
          type: {
            label: "Test type",
            description: "Test description",
            code: "test-code",
          },
        })

        const priceSet = await pricingModule.create({
          prices: [
            {
              amount: 3000,
              currency_code: "usd",
            },
          ],
        })

        await remoteLink.create([
          {
            [Modules.FULFILLMENT]: {
              shipping_option_id: shippingOption.id,
            },
            [Modules.PRICING]: {
              price_set_id: priceSet.id,
            },
          },
        ])

        const link = await remoteQuery({
          shipping_option: {
            fields: ["id"],
            price_set: {
              fields: ["id"],
            },
          },
        })

        expect(link).toHaveLength(1)
        expect(link).toEqual(
          expect.arrayContaining([
            expect.objectContaining({
              id: shippingOption.id,
              price_set: expect.objectContaining({
                id: priceSet.id,
              }),
            }),
          ])
        )
      })
    })
  },
})
