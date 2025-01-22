import React, { useState, useCallback, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Database, ArrowRight, Target, Brain, Beaker, Users, BookOpen, FlaskRound as Flask, ArrowUp } from 'lucide-react';

export const HomePage: React.FC = () => {
  const { user } = useAuth();
  const [number, setNumber] = useState(1);
  const [isHovering, setIsHovering] = useState(false);

  const generateNextNumber = useCallback((current: number) => {
    const increase = Math.floor(Math.random() * 20) + 1;
    return current + increase;
  }, []);

  useEffect(() => {
    let intervalId: NodeJS.Timeout | undefined;

    if (isHovering) {
      intervalId = setInterval(() => {
        setNumber(prev => generateNextNumber(prev));
      }, 100);
    } else {
      setNumber(1);
    }

    return () => {
      if (intervalId) {
        clearInterval(intervalId);
      }
    };
  }, [isHovering, generateNextNumber]);

  const sampleProtocols = [
    {
      id: 1,
      title: "BPC-157 + TB-500 Recovery Stack",
      creator: "Sam124",
      votes: 1872,
      supplements: ["BPC-157: 250mcg 2x daily", "TB-500: 2mg twice weekly"]
    },
    {
      id: 2,
      title: "Growth Hormone Secretagogues",
      creator: "Alex_Fitness",
      votes: 1654,
      supplements: ["CJC-1295: 100mcg daily", "Ipamorelin: 200mcg daily"]
    },
    {
      id: 3,
      title: "Joint Recovery Protocol",
      creator: "RunnerPro88",
      votes: 1542,
      supplements: ["BPC-157: 250mcg daily", "TB-500: 2mg weekly"]
    }
  ];

  return (
    <div className="bg-gradient-to-b from-white to-gray-50">
      {/* Hero Section */}
      <section className="relative overflow-hidden py-20">
        <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1584017911766-d451b3d0e843?q=80&w=1920&auto=format&fit=crop')] bg-cover bg-center opacity-5"></div>
        <div className="container mx-auto px-4 relative">
          <div className="max-w-3xl mx-auto text-center">
            <div className="mb-6">
              <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#0065A7]/10 text-[#0065A7] font-medium text-sm">
                <Database className="w-4 h-4" />
                Beta Release
              </span>
            </div>

            {/* n = 1 Equation */}
            <div 
              className="mb-8 inline-flex items-center justify-center text-[120px] font-bold cursor-pointer"
              onMouseEnter={() => setIsHovering(true)}
              onMouseLeave={() => setIsHovering(false)}
            >
              <span className="bg-gradient-to-r from-[#4F46E5] to-[#7C3AED] text-transparent bg-clip-text">n</span>
              <span className="mx-4 text-[#4F46E5]">=</span>
              <span className="bg-gradient-to-r from-[#7C3AED] to-[#EC4899] text-transparent bg-clip-text transition-all duration-300 ease-in-out">
                {number}
              </span>
            </div>

            <h1 className="text-6xl font-bold mb-6 bg-gradient-to-r from-gray-900 to-gray-600 text-transparent bg-clip-text">
              Community-driven health
            </h1>
            <p className="text-xl text-gray-600 mb-8 leading-relaxed">
              Discover community-driven information about peptides,
              supplements, and their effects on health and performance.
            </p>
            <div className="flex gap-4 justify-center mb-12">
              {!user ? (
                <Link
                  to="/login"
                  className="group bg-[#0065A7] text-white px-8 py-4 rounded-xl hover:bg-[#005490] transition-all hover:shadow-lg inline-flex items-center text-lg font-medium"
                >
                  Get Started
                  <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
                </Link>
              ) : (
                <Link
                  to="/protocols"
                  className="group bg-[#0065A7] text-white px-8 py-4 rounded-xl hover:bg-[#005490] transition-all hover:shadow-lg inline-flex items-center text-lg font-medium"
                >
                  View Protocols
                  <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
                </Link>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Featured Protocols Section */}
      <section className="py-20 bg-white">
        <div className="container mx-auto px-4">
          <div className="max-w-6xl mx-auto">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
              {/* Left Side - Description */}
              <div className="space-y-6">
                <h2 className="text-3xl font-bold text-gray-900">
                  Evidence-Based Protocols
                </h2>
                <p className="text-xl text-gray-600 leading-relaxed">
                  Discover community-based protocols about peptides, supplements, and esoteric health techniques and their effects on health and performance. Our platform brings together real n=1 experiences from around the globe to help you make informed decisions about your health journey.
                </p>
                <div className="space-y-4">
                  <div className="flex items-start gap-4">
                    <div className="bg-[#0065A7]/10 p-3 rounded-lg">
                      <svg className="w-6 h-6 text-[#0065A7]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold mb-1">Verified Protocols</h3>
                      <p className="text-gray-600">Each protocol is shared by real people doing real n=1 research and sharing their findings</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-4">
                    <div className="bg-[#0065A7]/10 p-3 rounded-lg">
                      <svg className="w-6 h-6 text-[#0065A7]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
                      </svg>
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold mb-1">Detailed Dosing</h3>
                      <p className="text-gray-600">Clear dosage instructions and timing for optimal results</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Right Side - Protocol Cards */}
              <div className="space-y-4">
                {/* Category Header */}
                <div className="mb-4">
                  <span className="inline-flex items-center px-4 py-2 rounded-lg text-lg font-semibold bg-[#0065A7]/10 text-[#0065A7]">
                    💪 Muscle Recovery
                  </span>
                </div>

                {/* Protocol Cards */}
                <div className="space-y-3">
                  {sampleProtocols.map(protocol => (
                    <div
                      key={protocol.id}
                      className="bg-white border rounded-lg p-4 hover:shadow-md transition"
                    >
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <h3 className="font-semibold text-gray-900">{protocol.title}</h3>
                          <p className="text-sm text-gray-500">created by {protocol.creator}</p>
                        </div>
                        <div className="flex flex-col items-center">
                          <button className="text-gray-400 hover:text-gray-600">
                            <ArrowUp className="w-4 h-4" />
                          </button>
                          <span className="text-sm text-gray-600">{protocol.votes}</span>
                        </div>
                      </div>
                      <div className="text-sm text-gray-600">
                        {protocol.supplements.map((supplement, index) => (
                          <div key={index} className="bg-gray-50 px-3 py-1 rounded mt-1">
                            {supplement}
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="relative overflow-hidden py-20">
        <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1584017911766-d451b3d0e843?q=80&w=1920&auto=format&fit=crop')] bg-cover bg-center opacity-5"></div>
        <div className="container mx-auto px-4 relative">
          <div className="max-w-3xl mx-auto">
            <h2 className="text-3xl font-bold text-center mb-4">
              What is PeptideHub?
            </h2>
            <p className="text-gray-600 text-center mb-12 max-w-2xl mx-auto">
              Your trusted platform for discovering and sharing your own protocols
              that optimize health and performance to the world.
            </p>
            <div className="grid md:grid-cols-3 gap-8">
              <div className="group p-6 rounded-xl bg-white/50 backdrop-blur-sm border hover:border-[#0065A7] transition-all hover:shadow-lg">
                <div className="bg-[#0065A7]/10 w-16 h-16 rounded-xl flex items-center justify-center mx-auto mb-4 group-hover:bg-[#0065A7] transition-colors">
                  <Target className="w-8 h-8 text-[#0065A7] group-hover:text-white transition-colors" />
                </div>
                <h3 className="text-xl font-semibold mb-2 text-center">Evidence-Based</h3>
                <p className="text-gray-600 text-center">
              All protocols are accompanied by the relevant literature that informed the n=1 experiment.
                </p>
              </div>
              <div className="group p-6 rounded-xl bg-white/50 backdrop-blur-sm border hover:border-[#0065A7] transition-all hover:shadow-lg">
                <div className="bg-[#0065A7]/10 w-16 h-16 rounded-xl flex items-center justify-center mx-auto mb-4 group-hover:bg-[#0065A7] transition-colors">
                  <Brain className="w-8 h-8 text-[#0065A7] group-hover:text-white transition-colors" />
                </div>
                <h3 className="text-xl font-semibold mb-2 text-center">Community-Driven</h3>
                <p className="text-gray-600 text-center">
                  Learn from real experiences (n=1) shared by our trusted community members.
                </p>
              </div>
              <div className="group p-6 rounded-xl bg-white/50 backdrop-blur-sm border hover:border-[#0065A7] transition-all hover:shadow-lg">
                <div className="bg-[#0065A7]/10 w-16 h-16 rounded-xl flex items-center justify-center mx-auto mb-4 group-hover:bg-[#0065A7] transition-colors">
                  <Database className="w-8 h-8 text-[#0065A7] group-hover:text-white transition-colors" />
                </div>
                <h3 className="text-xl font-semibold mb-2 text-center">Detailed Protocols</h3>
                <p className="text-gray-600 text-center">
                  Access comprehensive guides with dosage, timing, and expected outcomes.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};
