import React, { useState } from 'react';
import { sendPasswordReset } from '../firebase';
import { useNavigate } from 'react-router-dom';

export default function ForgotPassword(){
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true); setError(null); setMessage(null);
    try{
      await sendPasswordReset(email);
      setMessage('Password reset email sent. Check your inbox.');
    }catch(err){
      setError(err.message);
    }finally{setLoading(false)}
  }

  return (
    <div className="w-full max-w-md">
      <div className="bg-emerald-50 rounded-xl shadow-lg p-8">
        <h1 className="text-2xl font-bold text-center mb-6 text-gray-800">Forgot Password</h1>
        {message && <div className="text-sm text-green-800 bg-green-100 p-3 rounded mb-4">{message}</div>}
        {error && <div className="text-sm text-red-800 bg-red-100 p-3 rounded mb-4">{error}</div>}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
            <input type="email" value={email} onChange={e=>setEmail(e.target.value)} required placeholder="Enter your email" className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500" />
          </div>
          <div>
            <button type="submit" disabled={loading} className="w-full py-3 px-4 bg-gray-400 text-gray-800 font-semibold rounded-lg hover:bg-gray-500 transition-all duration-200">{loading ? 'Sending...' : 'Send reset email'}</button>
          </div>
          <div className="text-center text-sm mt-2">
            <button type="button" onClick={()=>navigate('/')} className="text-green-600 hover:underline">Back to login</button>
          </div>
        </form>
      </div>
    </div>
  )
}
