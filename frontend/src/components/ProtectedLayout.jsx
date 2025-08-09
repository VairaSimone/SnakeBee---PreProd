import React from 'react';
import NavBar from './Navbar';
import Footer from './Footer';

const ProtectedLayout = ({ children }) => {
  return (
    <>
      <main className=" pt-16">{children}</main>
    </>
  );
};

export default ProtectedLayout;
