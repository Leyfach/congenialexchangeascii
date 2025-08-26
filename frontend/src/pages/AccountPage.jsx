import { useEffect, useState } from 'react'
import api from '../services/api.js'

export default function AccountPage(){
  const [user, setUser] = useState(null)
  useEffect(()=>{
    const load = async()=> {
      try { const {data} = await api.get('/api/user/profile'); setUser(data) } catch {}
    }
    load()
  },[])

  return (
    <div className="max-w-3xl mx-auto card ascii-border">
      <div className="card-header"><h3 className="card-title">ACCOUNT</h3><span className="badge-green">PROFILE</span></div>
      {!user ? 'Loading…' : (
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <div className="text-green-300/70">ID</div>
            <div>{user.id}</div>
          </div>
          <div>
            <div className="text-green-300/70">Email</div>
            <div>{user.email}</div>
          </div>
          <div>
            <div className="text-green-300/70">Name</div>
            <div>{user.firstName} {user.lastName}</div>
          </div>
          <div>
            <div className="text-green-300/70">Created</div>
            <div>{new Date(user.createdAt).toLocaleString()}</div>
          </div>
        </div>
      )}
    </div>
  )
}