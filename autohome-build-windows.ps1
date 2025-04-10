try {
    # Function to handle errors
    function Handle-Error {
        param (
            [string]$message
        )
        Write-Output "ERROR: $message"
        Exit 1
    }

    # Download and install the latest version of Node.js and npm
    try {
        $nodeVersion = Invoke-RestMethod -Uri https://nodejs.org/dist/latest/ | Select-String -Pattern 'node-v(\d+\.\d+\.\d+)-x64.msi' | ForEach-Object { $_.Matches.Groups[1].Value }
        if (-not $nodeVersion) { Handle-Error "Failed to retrieve Node.js version." }
        $nodeInstaller = "https://nodejs.org/dist/latest/node-v$nodeVersion-x64.msi"
        Invoke-WebRequest -Uri $nodeInstaller -OutFile "$env:TEMP\nodejs.msi"
        Start-Process -FilePath "$env:TEMP\nodejs.msi" -ArgumentList "/quiet" -Wait
    } catch {
        Handle-Error "Failed to download or install Node.js. $_"
    }

    # Create a folder in the user's home directory called autohome
    try {
        $autohomePath = "$env:USERPROFILE\autohome"
        if (-not (Test-Path -Path $autohomePath)) {
            New-Item -ItemType Directory -Path $autohomePath -Force
        }
    } catch {
        Handle-Error "Failed to create autohome directory. $_"
    }

    # Download all files from the autohome repository on GitHub
    try {
        $repoUrl = "https://github.com/littlepunks/autohome/archive/refs/heads/master.zip"
        Invoke-WebRequest -Uri $repoUrl -OutFile "$env:TEMP\autohome.zip"
        Expand-Archive -Path "$env:TEMP\autohome.zip" -DestinationPath $autohomePath -Force
    } catch {
        Handle-Error "Failed to download or extract autohome repository. $_"
    }

    # Install the nodemon package globally
    try {
        npm install -g nodemon
    } catch {
        Handle-Error "Failed to install nodemon globally. $_"
    }

    # Navigate to the autohome directory and install dependencies
    try {
        Set-Location -Path $autohomePath
        npm install
    } catch {
        Handle-Error "Failed to install npm dependencies. $_"
    }

    # Start the application
    try {
             Start-Process -FilePath "npm" -ArgumentList "start" -NoNewWindow
    } catch {
        Handle-Error "Failed to start the application. $_"
    }

    # Wait for 10 seconds
    Start-Sleep -Seconds 10

    # Confirm the application is running by querying localhost:8080
    try {
        $response = Invoke-WebRequest -Uri "http://localhost:8080"
        if ($response.StatusCode -eq 200) {
            Write-Output "Application is running successfully."
        } else {
            Handle-Error "Application is not responding as expected. Status code: $($response.StatusCode)"
        }
    } catch {
        Handle-Error "Failed to confirm the application is running. $_"
    }

} catch {
    Write-Output "An unexpected error occurred. $_"
    Exit 1
} finally {
    # Clean up temporary files
    Remove-Item -Path "$env:TEMP\nodejs.msi" -ErrorAction SilentlyContinue
    Remove-Item -Path "$env:TEMP\autohome.zip" -ErrorAction SilentlyContinue
}
