import { PodcastForm } from './components/PodcastForm/PodcastForm';

export default function Home() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100 py-12">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            Speechify Podcasts
          </h1>
          <p className="text-gray-600">
            Transform your content into an engaging podcast format
          </p>
        </div>
        <PodcastForm />
      </div>
    </main>
  );
} 