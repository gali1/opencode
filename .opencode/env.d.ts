declare module "*.txt" {
  const content: string
  export default content
}

declare const Bun: {
  spawn(
    cmd: string[],
    options?: {
      stdout?: "pipe" | "ignore" | "inherit"
      stderr?: "pipe" | "ignore" | "inherit"
      cwd?: string
      env?: Record<string, string | undefined>
    },
  ): {
    stdout: ReadableStream<Uint8Array>
    stderr: ReadableStream<Uint8Array>
    exited: Promise<number>
    pid: number
    kill(signal?: number): void
  }
}
