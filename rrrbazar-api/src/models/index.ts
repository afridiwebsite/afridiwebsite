import { Schema } from './Schemas'


Schema.Order.associate(Schema)
Schema.Tournament.associate(Schema)
Schema.Transaction.associate(Schema)
Schema.Admin.associate(Schema)
Schema.AdminTransaction.associate(Schema)
Schema.ProductOrder.associate(Schema)
Schema.TopupPackage.associate(Schema)
Schema.StoreUnipin.associate(Schema)
Schema.TopupProduct.associate(Schema)
Schema.TopupProductInput.associate(Schema)
Schema.Category.associate(Schema)
Schema.Voucher.associate(Schema)
Schema.BotDispatch.associate(Schema)
Schema.VerificationSubmission.associate(Schema)
Schema.AdminSession.associate(Schema)
//Schema.AutoServer.associate(Schema)


export default Schema