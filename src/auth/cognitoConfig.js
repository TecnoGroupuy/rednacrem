export const cognitoAuthConfig = {
  authority: "https://cognito-idp.us-east-2.amazonaws.com/us-east-2_Jy8mPM6NJ",
  client_id: "4o79so763de3tr5agebi3aha16",
  redirect_uri: "https://rednacrem.tri.uy",
  post_logout_redirect_uri: "https://rednacrem.tri.uy",
  response_type: "code",
  scope: "openid email profile",
  onSigninCallback: () => {
    window.history.replaceState({}, document.title, window.location.pathname);
  }
};
