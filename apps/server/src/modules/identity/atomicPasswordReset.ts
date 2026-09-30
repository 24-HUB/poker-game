import { loadBetterAuthApi, loadBetterAuthContext } from '../../compatibility/better-auth-loader';

export async function atomicPasswordResetPlugin() {
  const { createAuthEndpoint, resetPassword } = await loadBetterAuthApi();
  const { runWithTransaction } = await loadBetterAuthContext();

  return {
    id: 'atomic-password-reset',
    endpoints: {
      resetPassword: createAuthEndpoint(resetPassword.path, resetPassword.options, (context) =>
        // The provider's internal adapter must share one transaction for the entire reset.
        runWithTransaction(context.context.adapter, () => resetPassword({
          ...context, asResponse: false, returnHeaders: false, returnStatus: false,
        })),
      ),
    },
  };
}
