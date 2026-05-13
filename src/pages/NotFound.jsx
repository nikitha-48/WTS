import React from 'react';
import { Link } from 'react-router-dom';

const NotFound = () => {
  return (
    <div className="mx-auto mt-24 max-w-md text-center">
      <h1 className="text-3xl font-semibold text-gray-800">404</h1>
      <p className="mt-2 text-sm text-gray-600">
        The page you are looking for could not be found.
      </p>
      <Link
        to="/"
        className="mt-4 inline-block rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
      >
        Go to home
      </Link>
    </div>
  );
};

export default NotFound;