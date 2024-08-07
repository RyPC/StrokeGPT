import React, { useState, useEffect } from 'react';
import axios from 'axios';
// import './App.css';
import Markdown from 'react-markdown';
import { Routes, Route } from 'react-router-dom';

import Home from './Home';
import NavBar from './NavBar'
import Login from './Login';
import PageNotFound from './PageNotFound';


function App() {
  return (
    <>
    <NavBar></NavBar>
    <Routes>
      <Route path="/" element={ <Home /> }></Route>
      <Route path="/login" element={ <Login /> }></Route>
      <Route path='*' element={ <PageNotFound /> }></Route>
    </Routes>
    </>
  );
}

export default App;
