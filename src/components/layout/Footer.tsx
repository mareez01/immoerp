import React from 'react';

export function Footer() {
  return (
    <footer className="border-t bg-white py-6 mt-auto">
      <div className="container mx-auto px-4 text-center">
        <p className="text-sm text-gray-500">
          © {new Date().getFullYear()} FL Smartech. All rights reserved.
        </p>
        <p className="text-sm text-gray-500">
          Developed by  
          <a 
           className="text-orange-400 hover:underline"
           href='https://immohub.in'> IMMO Hub
          </a>.
        </p>
      </div>
    </footer>
  );
}
