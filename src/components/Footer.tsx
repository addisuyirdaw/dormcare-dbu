export default function Footer() {
  return (
    <footer style={{ 
      borderTop: '1px solid var(--border)', 
      padding: '32px 0', 
      textAlign: 'center', 
      color: 'var(--text-muted)', 
      fontSize: '0.875rem', 
      background: '#090a0f',
      marginTop: 'auto'
    }}>
      <div className="container">
        <p>© {new Date().getFullYear()} Debre Birhan University. All rights reserved.</p>
      </div>
    </footer>
  );
}
