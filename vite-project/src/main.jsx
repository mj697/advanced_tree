import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

// ms. Abdi's idea about treating positions instead of people was great but in quantity it faced a challenge of adding all company structures.
// in quality, it was a great idea.

// the tree we have can add units and posts. clerks can be put into each post.
// it can replace our method in new evaluation app's client side. but our current method is faster and
// more non-admin user-friendly and does not need a specific hr company structure.

// both methods need a hr admin inspection each time evaluation is being executed so that changes to 
// units, posts and clerks are taken care of. but still our method is faster overall since it only cares
// about clerks.

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
