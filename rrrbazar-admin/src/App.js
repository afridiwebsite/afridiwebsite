import { Redirect, Route, Switch } from "react-router-dom";
import { ToastContainer } from 'react-toastify';
import AddWallet from "./components/AddWallet/AddWallet";
import AdminWallet from "./components/AdminWalletRequest/AdminWallet";
import AddAdmins from "./components/Admin/AddAdmin";
import Admins from "./components/Admin/Admins";
import Auths from "./components/Auths/Auths";
import ManageAuthPermission from "./components/Auths/ManageAuthPermission";
import AddBanner from "./components/Banner/AddBanner";
import Banner from "./components/Banner/Banner";
import EditBanner from "./components/Banner/EditBanner";
import AddNotice from "./components/Notice/AddNotice";
import EditNotice from "./components/Notice/EditNotice";
import Notice from "./components/Notice/Notice";
import Tutorials from "./components/Tutorial/Tutorials";
import AddTutorial from "./components/Tutorial/AddTutorial";
import EditTutorial from "./components/Tutorial/EditTutorial";
import ManageOrderPermission from "./components/Orders/ManageOrderPermission";
import WithDrawEarnWallet from './components/WithdrawEarnWallet/WithdrawEarnWallet';
import Orders from "./components/Orders/Orders";
import SubadminOrders from "./components/Orders/SubadminOrders";
import AddPackage from "./components/Packages/AddPackage";
import EditPackage from "./components/Packages/EditPackage";
import Packages from "./components/Packages/Packages";
import Voucher from "./components/Packages/Voucher/Voucher";
import VoucherStatistic from "./components/Vouchers/VoucherStatistic";
import AddPaymentMethod from "./components/PaymentMethod/AddPaymentMethod";
import EditPaymentMethod from "./components/PaymentMethod/EditPaymentMethod";
import PaymentMethod from "./components/PaymentMethod/PaymentMethod";
import AddPhysicalProduct from "./components/PhysicalProduct/AddPhysicalProduct";
import EditPhysicalProduct from "./components/PhysicalProduct/EditPhysicalProduct";
import PhysicalProduct from "./components/PhysicalProduct/PhysicalProduct";
import PhysicalProductOrder from "./components/PhysicalProduct/PhysicalProductOrder";
import ChangePassword from "./components/Profile/ChangePassword";
import Profile from "./components/Profile/Profile";
import SendSms from "./components/Sms/SendSms";
import Test from "./components/Test";
import AddTopupProduct from "./components/TopupProduct/AddTopupProduct";
import EditTopupProduct from "./components/TopupProduct/EditTopupProduct";
import TopupProduct from "./components/TopupProduct/TopupProduct";
import EditUser from "./components/Users/EditUser";
import EditEarnWallet from "./components/Users/EditEarnWallet";
import Users from "./components/Users/Users";
import AdminLayout from "./layouts/AdminLayout";
import BlankLayout from "./layouts/BlankLayout";
import { isAuth } from "./utils/handler.utils";
import Dashboard from "./views/admin/Dashboard";
import Settings from "./views/admin/Settings";
import Tables from "./views/admin/Tables";
import Login from "./views/auth/Login";
import Register from "./views/auth/Register";
import Landing from "./views/Landing";
import AdminWalletRequest from "./components/AdminWalletRequest/AdminWalletRequest";
import MyWalletRequest from "./components/AdminWalletRequest/MyWalletRequest";
import Bots from "./components/autobot/Bots";
import AddBot from "./components/autobot/AddBot";
import EditBot from "./components/autobot/EditBot";
import Categories from "./components/Categories/Categories";
import SiteSettings from "./components/SiteSettings/SiteSettings";
import SpinRewards from "./components/SiteSettings/SpinRewards";
import OrderComments from "./components/Orders/OrderComments";


function App() {
  const auth = isAuth()
  return (
    <>
      <ToastContainer />
      {auth ? (
        <AdminLayout>
          <Switch>
            <Route path="/" exact component={Dashboard} />

            <Route path="/order" exact component={Orders} />
            <Route path="/subadmin-order" exact component={SubadminOrders} />
            <Route path="/order-comments" exact component={OrderComments} />

            <Route path="/user" exact component={Users} />
            <Route path="/user/edit/:id" exact component={EditUser} />
            <Route path="/user/earn-wallet/edit/:id" exact component={EditEarnWallet} />

            <Route path="/bots" exact component={Bots} />
            <Route path="/botserver/add" exact component={AddBot} />
            <Route path="/botserver/edit/:id" exact component={EditBot} />

            <Route path="/payment-method" exact component={PaymentMethod} />
            <Route path="/payment-method/add" exact component={AddPaymentMethod} />
            <Route path="/payment-method/edit/:id" exact component={EditPaymentMethod} />

            <Route path="/notice" exact component={Notice} />
            <Route path="/notice/add" exact component={AddNotice} />
            <Route path="/notice/edit/:id" exact component={EditNotice} />

            <Route path="/tutorials" exact component={Tutorials} />
            <Route path="/tutorials/add" exact component={AddTutorial} />
            <Route path="/tutorials/edit/:id" exact component={EditTutorial} />

            <Route path="/topup-product" exact component={TopupProduct} />
            <Route path="/topup-product/add" exact component={AddTopupProduct} />
            <Route path="/topup-product/edit/:id" exact component={EditTopupProduct} />

            <Route path="/categories" exact component={Categories} />
            <Route path="/site-settings" exact component={SiteSettings} />
            <Route path="/spin-rewards" exact component={SpinRewards} />

            <Route path="/physical-product" exact component={PhysicalProduct} />
            <Route path="/physical-product/add" exact component={AddPhysicalProduct} />
            <Route path="/physical-product/edit/:id" exact component={EditPhysicalProduct} />

            <Route path="/banner" exact component={Banner} />
            <Route path="/banner/add" exact component={AddBanner} />
            <Route path="/banner/edit/:id" exact component={EditBanner} />

            <Route path="/admins" exact component={Admins} />
            <Route path="/admin/add" exact component={AddAdmins} />

            <Route path="/add-wallet" exact component={AddWallet} />
            <Route path="/admin-wallet" exact component={AdminWallet} />
            <Route path="/admin-wallet-request" exact component={AdminWalletRequest} />
            <Route path="/my-wallet-request" exact component={MyWalletRequest} />
            <Route path="/withdraw-earn-wallet" exact component={WithDrawEarnWallet} />
            {/* <Route path="/add-wallet/edit/:id" exact component={EditTransaction} /> */}

            <Route path="/manage-auth-permission/:id" exact component={ManageAuthPermission} />
            <Route path="/manage-order-permission/:id" exact component={ManageOrderPermission} />

            <Route path="/auths" exact component={Auths} />
            <Route path="/settings" exact component={Settings} />
            <Route path="/tables" exact component={Tables} />
            <Route path="/register" exact component={Register} />
            <Route path="/landing" exact component={Landing} />
            <Route path="/profile" exact component={Profile} />
            <Route path="/profile/change-password" exact component={ChangePassword} />

            <Route path="/topup-packages" exact component={Packages} />
            <Route path="/topup-package/edit/:id" exact component={EditPackage} />
            <Route path="/topup-package/add/:id" exact component={AddPackage} />
            <Route path="/topup-package/voucher/:id" exact component={Voucher} />
            <Route path="/vouchers/stats" exact component={VoucherStatistic} />

            <Route path="/send-sms" exact component={SendSms} />

            <Route path="/product-order" exact component={PhysicalProductOrder} />

            <Route path="/test" exact component={Test} />
            <Redirect from="/" to="/" />
          </Switch>
        </AdminLayout>
      ) : (
        <BlankLayout>
          <Switch>
            <Route path="/login" exact component={Login} />
            <Redirect from="/" to="/login" />
          </Switch>
        </BlankLayout>
      )}
    </>
  );
}

export default App;
