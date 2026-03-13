export const cognitoHostedUiDomain = "https://us-east-2jy8mpm6nj.auth.us-east-2.amazoncognito.com";
export const cognitoLogoutUri = "https://rednacrem.tri.uy";

export const cognitoAuthConfig = {
  authority: "https://cognito-idp.us-east-2.amazonaws.com/us-east-2_Jy8mPM6NJ",
  client_id: "40v9so763de3tr5agebi3aha16",
  redirect_uri: "https://rednacrem.tri.uy",
  post_logout_redirect_uri: cognitoLogoutUri,
  response_type: "code",
  scope: "email openid profile",
  onSigninCallback: () => {
    window.history.replaceState({}, document.title, window.location.pathname);
  }
};

export const buildCognitoHostedUiLoginUrl = () =>
  `${cognitoHostedUiDomain}/login?client_id=${cognitoAuthConfig.client_id}&response_type=${cognitoAuthConfig.response_type}&scope=${encodeURIComponent(cognitoAuthConfig.scope)}&redirect_uri=${encodeURIComponent(cognitoAuthConfig.redirect_uri)}&lang=es`;

export const buildCognitoHostedUiLogoutUrl = () =>
  `${cognitoHostedUiDomain}/logout?client_id=${cognitoAuthConfig.client_id}&logout_uri=${encodeURIComponent(cognitoLogoutUri)}`;
