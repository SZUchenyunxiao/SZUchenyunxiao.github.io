if (['127.0.0.1', 'localhost'].includes(location.hostname)) {
  try {
    await import('./local-config.local.js')
  } catch {
    // This ignored file exists only for the static local UI preview.
  }
}

await import('./dashboard.js')
