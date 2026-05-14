import { Sequelize } from 'sequelize'
import Admin from './Admin'
import AdminAuth from './AdminAuth'
import AdminTransaction from './AdminTransaction'
import AuthModule from './AuthModule'
import Banner from './Banner'
import EarnWallet from './EarnWallet'
import Inventorie from './Inventorie'
import Notice from './Notice'
import Order from './Order'
import Otp from './Otp'
import PasswordReset from './PasswordReset'
import PaymentMethod from './PaymentMethod'
import Product from './Product'
import ProductOrder from './ProductOrder'
import TopupPackage from './TopupPackage'
import TopupPackagePermission from './TopupPackagePermission'
import TopupPaymentMethod from './TopupPaymentMethod'
import TopupProduct from './TopupProduct'
import TopupProductInput from './TopupProductInput'
import Tournament from './Tournament'
import TournamentPlayer from './TournamentPlayer'
import TournamentPrize from './TournamentPrize'
import Transaction from './Transaction'
import User from './User'
import WithdrawEarnWallet from './WithdrawEarnWallet'
import StoreUnipin from './StoreUnipin'
import AutoServer from './AutoServer'
import Category from './Category'
import ProductCategory from './ProductCategory'
import SiteSetting from './SiteSetting'
import CoinTransaction from './CoinTransaction'
import SpinReward from './SpinReward'
import SpinResult from './SpinResult'



export const sequelize = new Sequelize(process.env.DB_NAME || '', process.env.DB_USER || '', process.env.DB_PASSWORD, {
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT) || 3306,
  dialect: 'mysql',
  // logging: false,
  pool: {
    max: 5,
    min: 0,
    acquire: 30000,
    idle: 1000
  },

});


export const Schema = {
  Otp: Otp(sequelize),
  User: User(sequelize),
  Order: Order(sequelize),
  Admin: Admin(sequelize),
  Notice: Notice(sequelize),
  Banner: Banner(sequelize),
  TopupProduct: TopupProduct(sequelize),
  TopupProductInput: TopupProductInput(sequelize),
  AdminAuth: AdminAuth(sequelize),
  AuthModule: AuthModule(sequelize),
  Transaction: Transaction(sequelize),
  AdminTransaction: AdminTransaction(sequelize),
  TopupPackage: TopupPackage(sequelize),
  PasswordReset: PasswordReset(sequelize),
  PaymentMethod: PaymentMethod(sequelize),
  TopupPaymentMethod: TopupPaymentMethod(sequelize),
  TopupPackagePermission: TopupPackagePermission(sequelize),
  Inventorie: Inventorie(sequelize),
  ProductOrder: ProductOrder(sequelize),
  Product: Product(sequelize),
  Tournament: Tournament(sequelize),
  TournamentPlayer: TournamentPlayer(sequelize),
  TournamentPrize: TournamentPrize(sequelize),
  EarnWallet: EarnWallet(sequelize),
  WithdrawEarnWallet: WithdrawEarnWallet(sequelize),
  StoreUnipin: StoreUnipin(sequelize),
  AutoServer: AutoServer(sequelize),
  Category: Category(sequelize),
  ProductCategory: ProductCategory(sequelize),
  SiteSetting: SiteSetting(sequelize),
  CoinTransaction: CoinTransaction(sequelize),
  SpinReward: SpinReward(sequelize),
  SpinResult: SpinResult(sequelize)
}