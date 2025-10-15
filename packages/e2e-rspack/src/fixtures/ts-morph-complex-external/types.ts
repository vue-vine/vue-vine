// Define base props
interface BaseProps {
  title: string
}

// Success variant prevents error props
type SuccessProps = BaseProps & {
  variant: 'success'
  message: string
  errorCode?: never // Prevents mixing
}

// Error variant prevents success props
type ErrorProps = BaseProps & {
  variant: 'error'
  errorCode: string
  message?: never // Prevents mixing
}

export type TestProps = SuccessProps | ErrorProps
