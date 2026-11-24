import { BrowserRouter, Link, Route, Routes } from 'react-router-dom';
import './index.css';
import './polish.css';
import './pages.css';
import './modern.css';
import './orders.css';
import Layout from './Layout';
import { BranchProvider, usePageTitle } from './lib';
import { SettingsProvider } from './settings';
import { PageHead } from './ui';
import Home from './pages/Home';
import Products from './pages/Products';
import Delivery from './pages/Delivery';
import About from './pages/About';
import Safety from './pages/Safety';
import Contact from './pages/Contact';
import Order from './pages/Order';
import Admin from './pages/Admin';
import Track from './pages/Track';


function NotFound() {
  usePageTitle('Page not found');
  return (
    <>
      <PageHead eyebrow="404" title={<>PAGE NOT <em>FOUND.</em></>} lead="That link does not lead anywhere. Head back home or place an order." />
      <section className="page-body">
        <Link className="button button-dark" to="/">BACK HOME <span>↗</span></Link>
      </section>
    </>
  );
}

export default function App() {
  return (
    <SettingsProvider>
    <BrowserRouter>
      <BranchProvider>
        <Routes>
          <Route element={<Layout />}>
            <Route index element={<Home />} />
            <Route path="products" element={<Products />} />
            <Route path="delivery" element={<Delivery />} />
            <Route path="about" element={<About />} />
            <Route path="safety" element={<Safety />} />
            <Route path="contact" element={<Contact />} />
            <Route path="order" element={<Order />} />
            <Route path="track" element={<Track />} />
            <Route path="admin" element={<Admin />} />
            <Route path="*" element={<NotFound />} />
          </Route>
        </Routes>
      </BranchProvider>
    </BrowserRouter>
    </SettingsProvider>
  );
}
