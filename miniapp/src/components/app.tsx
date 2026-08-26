import React from "react";
import { AnimationRoutes, App as ZmpApp, SnackbarProvider, ZMPRouter } from "zmp-ui";
import { Route } from "react-router-dom";
import Layout from "./layout";
import HomePage from "../pages/home";
import CreateListingPage from "../pages/create-listing";
import MyListingsPage from "../pages/my-listings";
import ListingDetailPage from "../pages/listing-detail";

const App: React.FC = () => {
  return (
    <ZmpApp>
      <SnackbarProvider>
        <ZMPRouter>
          <Layout>
            <AnimationRoutes>
              <Route path="/" element={<HomePage />} />
              <Route path="/dang-tin" element={<CreateListingPage />} />
              <Route path="/tin-cua-toi" element={<MyListingsPage />} />
              <Route path="/tin/:listingId" element={<ListingDetailPage />} />
            </AnimationRoutes>
          </Layout>
        </ZMPRouter>
      </SnackbarProvider>
    </ZmpApp>
  );
};

export default App;
