const MobileNotSupported = () => {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      <div className="max-w-md text-center space-y-6">
        <div className="text-6xl mb-4">📱</div>
        <h1 className="text-3xl font-bold text-foreground">Mobile Not Supported</h1>
        <p className="text-lg text-muted-foreground">
          Samplvr is designed for desktop use and requires a larger screen to function properly.
        </p>
        <p className="text-sm text-muted-foreground">
          Please access this application from a desktop or laptop computer for the best experience.
        </p>
      </div>
    </div>
  )
}

export default MobileNotSupported
