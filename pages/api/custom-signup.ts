
import type { NextApiRequest, NextApiResponse } from 'next';
import { auth } from '../../server/auth';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'POST') {
    try {
      const { email, password } = req.body;

      if (!email || !password) {
        return res.status(400).json({ message: 'Email and password are required' });
      }

      const result = await auth.emailAndPassword.signup({
        email,
        password,
      });

      if (result.success) {
        return res.status(200).json({ message: 'User created successfully', user: result.user });
      } else {
        return res.status(409).json({ message: result.error || 'Signup failed' });
      }
    } catch (error) {
      console.error('Sign-up error:', error);
      return res.status(500).json({ message: 'Internal Server Error' });
    }
  } else {
    res.setHeader('Allow', ['POST']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}
