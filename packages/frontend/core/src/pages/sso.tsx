import { AffineOtherPageLayout } from '@affine/component/affine-other-page-layout';
import { AuthService } from '@affine/core/modules/cloud';
import { useService } from '@toeverything/infra';
import { useCallback, useEffect, useState } from 'react';
import { Navigate, useSearchParams } from 'react-router-dom';

const SSO = ({ onSignedIn }: { onSignedIn?: () => void }) => {
  const [searchParams] = useSearchParams();
  const authService = useService(AuthService);

  // State for loading, error handling, and redirect
  const [isLoading, setIsLoading] = useState(false);
  const [passwordError, setPasswordError] = useState(false);
  const [redirectToHome, setRedirectToHome] = useState(false);

  // Define AffineSSO as an async function
  const AffineSSO = useCallback(
    async (token: string | null, team: string | null) => {
      if (isLoading) return; // Prevent multiple submissions
      setIsLoading(true);
      setPasswordError(false); // Reset error on new attempt
      try {
        await authService.signInSSO({
          token: token ?? '',
          team: team ?? '',
        });
        
        console.log('redirectttttttttttttttttttttttt');
        setRedirectToHome(true); // Set redirect to true after successful sign-in

      } catch (err) {
        console.error(err);
        setPasswordError(true); // Set error state if there's an issue
      } finally {
        setIsLoading(false); // Reset loading state
      }
    },
    [authService, isLoading, onSignedIn]
  );

  useEffect(() => {
    const token = searchParams.get('token');
    let team = searchParams.get('site'); // Rename 'site' to 'team'

    if (!team) {
      team = '';
    }

    if (token) {
      AffineSSO(token, team).catch(err => console.error(err));
    }
  }, [AffineSSO, searchParams]);

  if (redirectToHome) {
    return <Navigate to="/" />; // Redirect to home
  }

  return (
    <div>
      Sign In Page
      {isLoading && <p>Loading...</p>}
      {passwordError && <p>Error signing in. Please try again.</p>}
    </div>
  );
};

export const Component = () => {
  return (
    <AffineOtherPageLayout>
      <div style={{ padding: '0 20px' }}>
        <SSO />
      </div>
    </AffineOtherPageLayout>
  );
};
