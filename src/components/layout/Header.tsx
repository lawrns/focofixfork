export default function Header() {
  console.log('🚨 HEADER COMPONENT EXECUTED 🚨')

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      zIndex: 9999,
      backgroundColor: 'red',
      color: 'white',
      padding: '20px',
      fontSize: '24px',
      fontWeight: 'bold',
      border: '5px solid yellow'
    }}>
      🚨 HEADER IS RENDERING 🚨 FRESH COMPONENT 🚨
    </div>
  )
}
