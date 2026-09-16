import { useState } from 'react';
import ProjectCard from '../components/ProjectCard';
import { useGitHub } from '../hooks/useGitHub';
import { motion } from 'framer-motion';

export default function Projects() {
  const { repos, loading } = useGitHub();
  const [filter, setFilter] = useState('all');

  const languages = [...new Set(repos.map((r) => r.language).filter(Boolean))];

  const filteredRepos =
    filter === 'all'
      ? repos
      : repos.filter((r) => r.language === filter);

  return (
    <div className="min-h-screen pt-24 pb-12 px-6">
      <div className="container mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-center mb-12"
        >
          <h1 className="text-4xl md:text-5xl font-bold mb-4">
            <span className="gradient-text">المشاريع</span>
          </h1>
          <p className="text-text-secondary max-w-2xl mx-auto">
            جميع مشاريعي المنشورة على GitHub
          </p>
        </motion.div>

        {/* Language Filter */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="flex flex-wrap justify-center gap-3 mb-12"
        >
          <button
            onClick={() => setFilter('all')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-300 ${
              filter === 'all'
                ? 'bg-accent text-white'
                : 'glass text-text-secondary hover:text-accent'
            }`}
          >
            الكل
          </button>
          {languages.map((lang) => (
            <button
              key={lang}
              onClick={() => setFilter(lang)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-300 ${
                filter === lang
                  ? 'bg-accent text-white'
                  : 'glass text-text-secondary hover:text-accent'
              }`}
            >
              {lang}
            </button>
          ))}
        </motion.div>

        {/* Projects Grid */}
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredRepos.map((repo, index) => (
              <ProjectCard key={repo.id} project={repo} index={index} />
            ))}
          </div>
        )}

        {!loading && filteredRepos.length === 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-12"
          >
            <p className="text-text-secondary">لا توجد مشاريع في هذه الفئة</p>
          </motion.div>
        )}
      </div>
    </div>
  );
}
