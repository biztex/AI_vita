// DISABLED: This component has been replaced with react-toastify
// All toast notifications now use react-toastify's ToastContainer in layout.tsx
'use client'

// import { useTheme } from 'next-themes'
// import { Toaster as Sonner, ToasterProps } from 'sonner'

// const Toaster = ({ ...props }: ToasterProps) => {
//   const { theme = 'system' } = useTheme()

//   return (
//     <Sonner
//       theme={theme as ToasterProps['theme']}
//       className="toaster group"
//       style={
//         {
//           '--normal-bg': 'var(--popover)',
//           '--normal-text': 'var(--popover-foreground)',
//           '--normal-border': 'var(--border)',
//         } as React.CSSProperties
//       }
//       {...props}
//     />
//   )
// }

// Placeholder export to prevent import errors
export function Toaster() {
  return null
}
