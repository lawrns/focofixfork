import MainLayout from '@/components/layout/MainLayout'

export default function MermaidLayout({ children }: { children: React.ReactNode }) {
  return (
    <MainLayout>
      {children}
    </MainLayout>
  )
}
