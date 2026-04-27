'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

interface Choice {
  text: string;
  branch: string;
}

interface Props {
  choices: Choice[];
  novelId: string;
  currentBranch: string;
  userId: string | null;
  userBranch: string | null | undefined;
}

export default function BranchChoice({ choices, novelId, currentBranch, userId, userBranch }: Props) {
  const router = useRouter();
  const [showModal, setShowModal] = useState(false);
  const [selectedChoice, setSelectedChoice] = useState<Choice | null>(null);

  const handleChoice = async (choice: Choice) => {
    if (!userId) {
      // 未登录，跳转登录
      router.push('/auth/login');
      return;
    }

    setSelectedChoice(choice);
    setShowModal(true);
  };

  const confirmChoice = async () => {
    if (!selectedChoice || !userId) return;

    try {
      await fetch('/api/user/progress', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          novelId,
          branch: selectedChoice.branch
        })
      });
      
      // 跳转到对应的支线章节
      router.push(`/novels/${novelId}/${selectedChoice.branch}-1`);
    } catch (error) {
      console.error('保存分支选择失败', error);
    }
  };

  return (
    <div className="mt-12 p-6 bg-gradient-to-r from-purple-50 to-indigo-50 dark:from-purple-900/20 dark:to-indigo-900/20 rounded-xl border border-purple-200 dark:border-purple-800">
      <h3 className="text-lg font-bold text-center text-purple-700 dark:text-purple-300 mb-4">
        🔀 剧情分支点
      </h3>
      <p className="text-center text-gray-600 dark:text-gray-400 mb-6">
        你的选择将影响故事走向
      </p>
      
      <div className="space-y-3">
        {choices.map((choice, index) => (
          <button
            key={index}
            onClick={() => handleChoice(choice)}
            className="w-full p-4 bg-white dark:bg-gray-800 rounded-lg border-2 border-purple-200 dark:border-purple-700 hover:border-purple-500 dark:hover:border-purple-500 transition text-left group"
          >
            <div className="flex items-center gap-3">
              <span className="w-8 h-8 bg-purple-100 dark:bg-purple-900 text-purple-600 dark:text-purple-300 rounded-full flex items-center justify-center font-bold">
                {String.fromCharCode(65 + index)}
              </span>
              <span className="text-gray-800 dark:text-gray-200 group-hover:text-purple-700 dark:group-hover:text-purple-300">
                {choice.text}
              </span>
            </div>
          </button>
        ))}
      </div>

      {/* 确认弹窗 */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 max-w-sm w-full">
            <h4 className="font-bold text-lg text-gray-800 dark:text-white mb-2">确认选择</h4>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              确定要{selectedChoice?.text}吗？此选择将影响后续剧情。
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowModal(false)}
                className="flex-1 py-2 bg-gray-100 dark:bg-gray-700 rounded-lg text-gray-700 dark:text-gray-300"
              >
                取消
              </button>
              <button
                onClick={confirmChoice}
                className="flex-1 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
              >
                确认
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
