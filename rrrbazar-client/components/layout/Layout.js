import Footer from '../Footer';
import Header from '../Header';

function Layout({ children, disabledHeader }) {
  return (
    <div className="min-h-screen flex flex-col">
      {!disabledHeader && <Header />}
      {children}
      <Footer />
    </div>
  );
}

export default Layout;
