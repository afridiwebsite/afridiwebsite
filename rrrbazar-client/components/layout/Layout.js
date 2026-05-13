import Footer from '../Footer';
import Header from '../Header';

function Layout({ children, disabledHeader, disabledFooter }) {
  return (
    <div className="min-h-screen flex flex-col">
      {!disabledHeader && <Header />}
      {children}
      {!disabledFooter && <Footer />}
    </div>
  );
}

export default Layout;
