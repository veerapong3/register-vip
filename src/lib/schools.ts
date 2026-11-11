export type School = {
  id: string;
  name: string;
  district: string;
};

/** โรงเรียนในสังกัด สพม.มุกดาหาร จำนวน 30 โรงเรียน */
export const SCHOOLS: School[] = [
  { id: "49012021", name: "กกตูมประชาสรรค์ รัชมังคลาภิเษก", district: "ดงหลวง" },
  { id: "49012025", name: "คำชะอีพิทยาคม", district: "คำชะอี" },
  { id: "49012022", name: "คำชะอีวิทยาคาร", district: "คำชะอี" },
  { id: "49012023", name: "คำบกวิทยาคาร", district: "คำชะอี" },
  { id: "49012005", name: "คำป่าหลายสรรพวิทย์", district: "เมืองมุกดาหาร" },
  { id: "49012012", name: "คำสร้อยพิทยาสรรค์", district: "นิคมคำสร้อย" },
  { id: "49012024", name: "ชัยปัญญาวิทยานุสรณ์", district: "คำชะอี" },
  { id: "49012016", name: "โชคชัยวิทยา", district: "นิคมคำสร้อย" },
  { id: "49012010", name: "ดงมอนวิทยาคม", district: "เมืองมุกดาหาร" },
  { id: "49012006", name: "ดงเย็นวิทยาคม", district: "เมืองมุกดาหาร" },
  { id: "49012020", name: "ดงหลวงวิทยา", district: "ดงหลวง" },
  { id: "49012017", name: "ดอนตาลวิทยา", district: "ดอนตาล" },
  { id: "49012004", name: "นวมินทราชูทิศ อีสาน", district: "เมืองมุกดาหาร" },
  { id: "49012007", name: "นาวาราชกิจพิทยานุสรณ์", district: "เมืองมุกดาหาร" },
  { id: "49012002", name: "นาโสกวิทยาคาร", district: "เมืองมุกดาหาร" },
  { id: "49012019", name: "ผาเทิบวิทยา", district: "ดอนตาล" },
  { id: "49012003", name: "ผึ่งแดดวิทยาคาร", district: "เมืองมุกดาหาร" },
  { id: "49012029", name: "พลังราษฎร์พิทยาสรรพ์", district: "หนองสูง" },
  { id: "49012018", name: "โพธิ์ไทรวิทยา", district: "ดอนตาล" },
  { id: "49012008", name: "มุกดาวิทยานุกูล", district: "เมืองมุกดาหาร" },
  { id: "49012001", name: "มุกดาหาร", district: "เมืองมุกดาหาร" },
  { id: "49012011", name: "เมืองมุกวิทยาคม", district: "เมืองมุกดาหาร" },
  { id: "49012014", name: "ร่มเกล้าพิทยาสรรค์", district: "นิคมคำสร้อย" },
  {
    id: "49012009",
    name: "วิทยาศาสตร์จุฬาภรณราชวิทยาลัย มุกดาหาร",
    district: "เมืองมุกดาหาร",
  },
  { id: "49012015", name: "แวงใหญ่พิทยาสรรค์", district: "นิคมคำสร้อย" },
  { id: "49012030", name: "หนองแวงวิทยาคม", district: "หนองสูง" },
  { id: "49012028", name: "หนองสูงสามัคคีวิทยา", district: "หนองสูง" },
  { id: "49012027", name: "หว้านใหญ่วิทยา", district: "หว้านใหญ่" },
  { id: "49012026", name: "เหล่าประชาอุทิศ", district: "คำชะอี" },
  { id: "49012013", name: "อุดมวิทย์", district: "นิคมคำสร้อย" },
].sort((a, b) => a.name.localeCompare(b.name, "th"));

export function filterSchools(query: string): School[] {
  const q = query.trim().toLowerCase();
  if (!q) return SCHOOLS;
  return SCHOOLS.filter(
    (s) =>
      s.name.toLowerCase().includes(q) ||
      s.district.toLowerCase().includes(q) ||
      s.id.includes(q),
  );
}
