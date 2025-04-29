import 'bootstrap/dist/css/bootstrap.min.css';
import { useEffect } from 'react';

function MyApp({ Component, pageProps }) {
  // This ensures Bootstrap JavaScript works with Next.js
  useEffect(() => {
    // Import Bootstrap JS only on client side
    if (typeof window !== 'undefined') {
      require('bootstrap/dist/js/bootstrap.bundle.min.js');
    }
  }, []);

  return <Component {...pageProps} />;
}

export default MyApp;