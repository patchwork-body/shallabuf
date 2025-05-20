import { createFileRoute } from "@tanstack/react-router";
import Spline from "@splinetool/react-spline";
import { Route as RootRoute } from "./__root";
import { useSession } from "~/contexts/session";

// Trusted company logos
const TRUSTED_LOGOS = [
  {
    src: "https://cdn.worldvectorlogo.com/logos/microsoft-5.svg",
    alt: "Microsoft",
  },
  {
    src: "https://cdn.worldvectorlogo.com/logos/google-1-1.svg",
    alt: "Google",
  },
  {
    src: "https://upload.wikimedia.org/wikipedia/commons/a/a9/Amazon_logo.svg",
    alt: "Amazon",
  },
  {
    src: "https://upload.wikimedia.org/wikipedia/commons/7/7b/Meta_Platforms_Inc._logo.svg",
    alt: "Meta",
  },
  {
    src: "https://cdn.worldvectorlogo.com/logos/netflix-4.svg",
    alt: "Netflix",
  },
];

export const Route = createFileRoute("/")({
  component: Index,
});

function Index() {
  const { session } = useSession();

  return (
    <div className="bg-white dark:bg-gray-950 text-gray-900 dark:text-gray-100">
      {/* Hero Section: Minimal, spacious, bold */}
      <section className="relative flex flex-col items-center justify-center min-h-[70vh] py-24 px-4 text-center bg-gradient-to-b from-primary to-white dark:from-gray-900 dark:to-gray-950">
        <h1 className="text-5xl md:text-7xl font-extrabold mb-6 leading-tight tracking-tight max-w-3xl mx-auto">
          Real-time State Sync for Modern Apps
        </h1>
        <p className="text-xl md:text-2xl mb-10 max-w-2xl mx-auto text-gray-600 dark:text-gray-300">
          Managed WebSocket service with CRDT-powered state sharing. Build
          collaborative, multiplayer, and live apps—no infra required.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center mb-10">
          <a
            href={session ? "/dashboard" : "/login"}
            className="px-8 py-3 bg-primary text-white rounded-full font-bold text-lg shadow hover:bg-primary/80 transition"
          >
            Start Free
          </a>
          <a
            href="#how-it-works"
            className="px-8 py-3 bg-white dark:bg-gray-900 border border-primary text-primary dark:text-primary-400 rounded-full font-bold text-lg shadow hover:bg-primary/80 dark:hover:bg-gray-800 transition"
          >
            How It Works
          </a>
        </div>
        {/* Spline 3D Visual */}
        <div className="w-full max-w-3xl h-72 mx-auto mt-8">
          <Spline
            className="w-full h-full"
            scene="https://prod.spline.design/6Wq1Q7YGyM-iab9i/scene.splinecode"
          />
        </div>
      </section>

      {/* Trust Bar: Logos of customers/partners */}
      <section className="py-6 px-4 bg-white dark:bg-gray-950 border-b border-gray-100 dark:border-gray-900">
        <div className="max-w-5xl mx-auto flex flex-wrap items-center justify-center gap-8 opacity-80">
          <span className="text-gray-400 text-sm font-semibold mr-4">
            Trusted by
          </span>
          {TRUSTED_LOGOS.map((logo, i) => (
            <img
              key={i}
              src={logo.src}
              alt={logo.alt}
              className="h-8 w-auto grayscale opacity-80 hover:opacity-100 transition"
            />
          ))}
        </div>
      </section>

      {/* Key Benefits: Card grid */}
      <section className="py-20 px-4 max-w-6xl mx-auto" id="benefits">
        <h2 className="text-3xl md:text-4xl font-bold mb-12 text-center">
          Why Shallabuf?
        </h2>
        <div className="grid md:grid-cols-3 gap-8">
          <BenefitCard
            title="Instant State Sync"
            desc="CRDT-powered updates keep all users in sync, instantly and conflict-free."
          />
          <BenefitCard
            title="Fully Managed Infra"
            desc="No servers to run. We handle scaling, reliability, and security."
          />
          <BenefitCard
            title="Flexible & Fast"
            desc="Integrate in minutes. Pay only for what you use."
          />
        </div>
      </section>

      {/* How It Works: Split layout, step-by-step with code/visual */}
      <section className="py-20 px-4 max-w-6xl mx-auto" id="how-it-works">
        <h2 className="text-3xl md:text-4xl font-bold mb-12 text-center">
          How It Works
        </h2>
        <div className="space-y-16">
          <HowItWorksStep
            step="1"
            title="Connect to a Channel"
            desc="Use our SDK to join a channel and start syncing state."
            code={`import { connect } from 'your-ws-sdk';\nconst channel = connect('room-123');`}
          />
          <HowItWorksStep
            step="2"
            title="Update Shared State"
            desc="Update the shared state object. Changes are merged and broadcast in real-time using CRDTs."
            code={`channel.state.set({ counter: channel.state.counter + 1 });`}
            flip
          />
          <HowItWorksStep
            step="3"
            title="Listen for Updates"
            desc="React to state changes from any member in the channel."
            code={`channel.on('update', (state) => {\n  // Update your UI\n  console.log(state);\n});`}
          />
        </div>
        <div className="text-center mt-12">
          <a href="/docs" className="text-primary underline font-semibold">
            Read the full documentation →
          </a>
        </div>
      </section>

      {/* Features: Card grid, modern UI */}
      <section className="py-20 px-4 max-w-6xl mx-auto" id="features">
        <h2 className="text-3xl md:text-4xl font-bold mb-12 text-center">
          Features
        </h2>
        <div className="grid md:grid-cols-3 gap-8">
          <FeatureCard
            title="CRDT Sync"
            desc="Automatic conflict-free merging of state across all clients."
          />
          <FeatureCard
            title="WebSocket Channels"
            desc="Low-latency, persistent connections for real-time collaboration."
          />
          <FeatureCard
            title="Role-based Access"
            desc="Granular permissions for channel members and admins."
          />
          <FeatureCard
            title="Scalable Infra"
            desc="Auto-scaling, DDoS protection, and global edge delivery."
          />
          <FeatureCard
            title="SDKs & Docs"
            desc="Easy-to-use SDKs for JS/TS, React, and more. Comprehensive docs."
          />
          <FeatureCard
            title="Usage Analytics"
            desc="Track channel activity, usage, and billing in real time."
          />
        </div>
      </section>

      {/* Use Cases: Card grid */}
      <section className="py-20 px-4 max-w-6xl mx-auto" id="use-cases">
        <h2 className="text-3xl md:text-4xl font-bold mb-12 text-center">
          Use Cases
        </h2>
        <div className="grid md:grid-cols-3 gap-8">
          <BenefitCard
            title="Collaborative Apps"
            desc="Docs, whiteboards, and design tools with real-time editing."
          />
          <BenefitCard
            title="Multiplayer Games"
            desc="Sync player state, lobbies, and game sessions live."
          />
          <BenefitCard
            title="Live Dashboards"
            desc="Broadcast analytics, metrics, and IoT data to all viewers."
          />
        </div>
      </section>

      {/* Pricing: Minimal, bold snapshot */}
      <section
        className="py-20 px-4 max-w-3xl mx-auto text-center"
        id="pricing"
      >
        <h2 className="text-3xl md:text-4xl font-bold mb-8">Pricing</h2>
        <div className="bg-white dark:bg-gray-900 rounded-2xl shadow border border-gray-200 dark:border-gray-800 p-10">
          <h3 className="text-2xl font-bold mb-2">Pay as You Go</h3>
          <p className="mb-4 text-gray-600 dark:text-gray-300">
            Simple, usage-based pricing. No hidden fees.
          </p>
          <div className="flex flex-col md:flex-row justify-center gap-8 items-center mb-4">
            <div className="text-5xl font-extrabold text-primary">$0.10</div>
            <div className="text-lg">per 1,000 channel hours</div>
          </div>
          <a href="/pricing" className="text-primary underline font-semibold">
            See full pricing →
          </a>
        </div>
      </section>

      {/* FAQ: Concise, dropdowns */}
      <section className="py-20 px-4 max-w-3xl mx-auto" id="faq">
        <h2 className="text-3xl md:text-4xl font-bold mb-8 text-center">FAQ</h2>
        <div className="space-y-6">
          <FaqItem
            q="How is my data secured?"
            a="All data is encrypted in transit and at rest. We use industry best practices for security and compliance."
          />
          <FaqItem
            q="Can I self-host?"
            a="Currently, we offer only the managed cloud service. Contact us for enterprise options."
          />
          <FaqItem
            q="What is a channel hour?"
            a="A channel hour is one channel active for one hour, regardless of the number of members."
          />
          <FaqItem
            q="How do I get started?"
            a="Sign up for a free account and follow our quickstart guide in the docs."
          />
        </div>
      </section>

      {/* Final CTA: Bold, modern, inviting */}
      <section className="py-20 px-4 text-center bg-primary text-white rounded-t-3xl">
        <h2 className="text-3xl md:text-4xl font-bold mb-4">
          Ready to build real-time collaboration?
        </h2>
        <p className="mb-8 text-lg">
          Start syncing state in minutes. No infra, no hassle.
        </p>
        <a
          href="/login"
          className="px-8 py-3 bg-white text-primary rounded-full font-bold text-lg shadow hover:bg-primary/80 transition"
        >
          Get Started Free
        </a>
      </section>
    </div>
  );
}

// Card component for benefits, use cases
function BenefitCard({ title, desc }: { title: string; desc: string }) {
  return (
    <div className="p-8 bg-primary dark:bg-gray-900 rounded-2xl shadow hover:shadow-lg transition border border-transparent hover:border-primary dark:hover:border-primary/80">
      <h3 className="font-semibold text-xl mb-2">{title}</h3>
      <p className="text-gray-600 dark:text-gray-300">{desc}</p>
    </div>
  );
}

// Card component for features
function FeatureCard({ title, desc }: { title: string; desc: string }) {
  return (
    <div className="p-8 bg-white dark:bg-gray-900 rounded-2xl shadow border border-gray-200 dark:border-gray-800 hover:shadow-lg transition">
      <h3 className="font-semibold text-xl mb-2">{title}</h3>
      <p className="text-gray-600 dark:text-gray-300">{desc}</p>
    </div>
  );
}

// Split step for How It Works
function HowItWorksStep({
  step,
  title,
  desc,
  code,
  flip,
}: {
  step: string;
  title: string;
  desc: string;
  code: string;
  flip?: boolean;
}) {
  return (
    <div
      className={`flex flex-col md:flex-row ${
        flip ? "md:flex-row-reverse" : ""
      } items-center gap-8 md:gap-16`}
    >
      <div className="flex-1">
        <div className="flex items-center gap-3 mb-2">
          <span className="w-8 h-8 rounded-full bg-primary text-white font-bold flex items-center justify-center">
            {step}
          </span>
          <h3 className="font-semibold text-xl">{title}</h3>
        </div>
        <p className="mb-4 text-gray-600 dark:text-gray-300">{desc}</p>
      </div>
      <pre className="flex-1 bg-gray-100 dark:bg-gray-900 rounded-xl p-6 text-left text-sm overflow-x-auto border border-gray-200 dark:border-gray-800">
        <code>{code}</code>
      </pre>
    </div>
  );
}

// FAQ dropdown item
function FaqItem({ q, a }: { q: string; a: string }) {
  return (
    <details className="bg-primary/80 dark:bg-gray-900 rounded-lg p-4">
      <summary className="font-semibold cursor-pointer">{q}</summary>
      <p className="mt-2 text-gray-600 dark:text-gray-300">{a}</p>
    </details>
  );
}
