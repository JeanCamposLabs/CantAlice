import type { ReactNode } from 'react'
import { motion } from 'framer-motion'
import { KeyRound, Music2, Wifi } from 'lucide-react'
import { beginLogin } from '../spotify/auth'

/** Generic empty state with an icon, title and helper text. */
export function EmptyState({
  icon,
  title,
  description,
  action,
}: {
  icon: ReactNode
  title: string
  description: string
  action?: ReactNode
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="mx-auto flex max-w-md flex-col items-center gap-4 py-16 text-center"
    >
      <div className="grid h-20 w-20 place-items-center rounded-3xl bg-white/5 text-rose-300">
        {icon}
      </div>
      <h3 className="font-display text-2xl">{title}</h3>
      <p className="text-mist/70">{description}</p>
      {action}
    </motion.div>
  )
}

/** Shown when no Spotify Client ID has been configured yet. */
export function SetupNotice() {
  return (
    <div className="glass mx-auto max-w-2xl rounded-3xl p-8">
      <div className="mb-4 flex items-center gap-3">
        <div className="grid h-12 w-12 place-items-center rounded-2xl bg-gold/15 text-gold">
          <KeyRound />
        </div>
        <h3 className="font-display text-2xl">Quase lá — falta conectar o Spotify</h3>
      </div>
      <p className="text-mist/80">
        Para tocar as músicas e mostrar as letras, este site precisa de um{' '}
        <strong>Client ID</strong> do Spotify (gratuito). É rapidinho:
      </p>
      <ol className="mt-4 space-y-2 text-sm text-mist/80">
        <li>
          1. Acesse o{' '}
          <a
            className="text-rose-300 underline"
            href="https://developer.spotify.com/dashboard"
            target="_blank"
            rel="noreferrer"
          >
            Spotify Developer Dashboard
          </a>{' '}
          e crie um app.
        </li>
        <li>
          2. Em <em>Redirect URIs</em>, adicione o endereço deste site (ex.:{' '}
          <code className="rounded bg-black/30 px-1.5 py-0.5">{window.location.origin + window.location.pathname}</code>).
        </li>
        <li>
          3. Copie o <em>Client ID</em> e cole em{' '}
          <code className="rounded bg-black/30 px-1.5 py-0.5">src/config.ts</code> (ou defina o
          segredo <code className="rounded bg-black/30 px-1.5 py-0.5">VITE_SPOTIFY_CLIENT_ID</code> no GitHub).
        </li>
      </ol>
      <p className="mt-4 text-sm text-mist/60">
        As instruções completas estão no arquivo <code>README.md</code> do projeto.
      </p>
    </div>
  )
}

/** Shown when a feature needs Spotify login. */
export function ConnectGate({ feature }: { feature: string }) {
  return (
    <EmptyState
      icon={<Music2 size={34} />}
      title="Conecte seu Spotify"
      description={`Conecte sua conta do Spotify para ${feature}.`}
      action={
        <button onClick={() => beginLogin()} className="btn-primary">
          Conectar com o Spotify
        </button>
      }
    />
  )
}

/** Generic network/loading-failed message. */
export function ErrorState({ message }: { message: string }) {
  return (
    <EmptyState
      icon={<Wifi size={34} />}
      title="Algo deu errado"
      description={message}
    />
  )
}
