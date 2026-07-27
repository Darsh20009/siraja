export default function jwksClient() {
  return {
    getSigningKey: async () => {
      throw new Error('Apple JWKS access is disabled in isolated tests.');
    },
  };
}