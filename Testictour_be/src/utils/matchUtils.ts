/**
 * Tính toán vị trí của người chơi dựa trên điểm số
 * @param scores Map điểm số của người chơi (userId -> điểm số)
 * @returns Map vị trí của người chơi (userId -> vị trí)
 */
export function calculatePlayerPosition(scores: Map<string, number>): Map<string, number> {
  // Chuyển map thành mảng để sắp xếp
  const entries = Array.from(scores.entries());
  
  // Sắp xếp theo điểm số giảm dần
  entries.sort((a, b) => b[1] - a[1]);
  
  // Tạo map vị trí
  const positions = new Map<string, number>();
  
  // Xử lý trường hợp điểm số bằng nhau
  let currentPosition = 1;
  let currentScore = entries[0]?.[1] ?? 0;
  let sameScoreCount = 0;
  
  for (let i = 0; i < entries.length; i++) {
    const [userId, score] = entries[i];
    
    if (score < currentScore) {
      // Điểm số mới thấp hơn, cập nhật vị trí
      currentPosition += sameScoreCount;
      currentScore = score;
      sameScoreCount = 1;
    } else {
      // Điểm số bằng nhau, tăng số lượng người có cùng điểm
      sameScoreCount++;
    }
    
    positions.set(userId, currentPosition);
  }
  
  return positions;
} 