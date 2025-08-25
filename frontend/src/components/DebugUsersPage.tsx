import { useState } from 'react'
import { PlusIcon } from '@heroicons/react/24/solid'

export default function DebugUsersPage() {
  const [modalOpen, setModalOpen] = useState(false)

  const handleButtonClick = () => {
    console.log('Button clicked!')
    alert('Button clicked!')
    setModalOpen(true)
  }

  return (
    <div className="p-6">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-2xl font-bold mb-4">Debug Users Page</h1>
        
        <button 
          onClick={handleButtonClick}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg"
        >
          <PlusIcon className="w-5 h-5 inline mr-2" />
          Test Button
        </button>

        {modalOpen && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
            <div className="bg-white p-6 rounded-lg">
              <h2 className="text-lg font-bold">Test Modal</h2>
              <p>Modal is working!</p>
              <button 
                onClick={() => setModalOpen(false)}
                className="mt-4 px-4 py-2 bg-gray-600 text-white rounded"
              >
                Close
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
