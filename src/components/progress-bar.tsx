'use client';

import { useEffect } from 'react';
import NProgress from 'nprogress';
import 'nprogress/nprogress.css';

export function ProgressBar() {
  useEffect(() => {
    // Configure NProgress
    NProgress.configure({
      showSpinner: false,
      minimum: 0.3,
      easing: 'ease',
      speed: 800,
      trickleSpeed: 200,
    });

    // Inject custom styles for the progress bar
    const style = document.createElement('style');
    style.textContent = `
      #nprogress {
        pointer-events: none;
      }

      #nprogress .bar {
        background: linear-gradient(to right, #3b82f6, #2563eb);
        position: fixed;
        z-index: 1031;
        top: 0;
        left: 0;
        width: 100%;
        height: 2px;
        box-shadow: 0 0 10px 0 #3b82f6, 0 0 5px 0 #2563eb;
      }

      #nprogress .peg {
        box-shadow: 0 0 15px #3b82f6, 0 0 8px #2563eb;
      }

      #nprogress.nprogress-custom {
        pointer-events: none;
      }

      #nprogress.nprogress-custom .bar {
        transition: width 0.3s ease, opacity 0.3s ease;
      }
    `;
    document.head.appendChild(style);

    return () => {
      document.head.removeChild(style);
    };
  }, []);

  return null;
}
