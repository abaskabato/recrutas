
import type { NextApiRequest, NextApiResponse } from 'next';
import { auth } from '../../../../server/auth';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  console.log('Method received:', req.method);
  if (req.method === 'POST') {
    try {
      const { email, password, name } = req.body;

      if (!email || !password) {
        return res.status(400).json({ message: 'Email and password are required' });
      }

      // Use the better-auth signup method
      const result = await auth.emailAndPassword.signup({
        email,
        password,
        // The 'name' field might not be standard for better-auth,
        // so we pass it as additional user data if possible.
        // This depends on the library's specific implementation.
        // If it doesn't support a 'name' field directly, you may need
        // to update the user profile in a separate step.
        userData: { name },
      });

      if (result.success) {
        // The signup was successful. The library might handle cookies/sessions automatically.
        // You can customize the response as needed.
        return res.status(200).json({ message: 'User created successfully', user: result.user });
      } else {
        // The signup failed (e.g., user already exists).
        // The library should provide a descriptive error message.
        return res.status(409).json({ message: result.error || 'Signup failed' });
      }
    } catch (error) {
      console.error('Sign-up error:', error);
      return res.status(500).json({ message: 'Internal Server Error' });
    }
  } else {
    // Handle any other HTTP method
    res.setHeader('Allow', ['POST']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}
