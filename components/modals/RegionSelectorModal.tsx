import { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, Modal, FlatList } from 'react-native';
import { Colors, Spacing, Radius, Typography } from '../../constants/theme';

const KOREA_REGIONS: Record<string, string[]> = {
  '서울특별시': [], '부산광역시': [], '대구광역시': [], '인천광역시': [],
  '광주광역시': [], '대전광역시': [], '울산광역시': [], '세종특별자치시': [],
  '경기도': ['수원시','성남시','안양시','안산시','용인시','파주시','광명시','평택시','시흥시','군포시','의왕시','하남시','이천시','남양주시','화성시','김포시','광주시','구리시','여주시','양평군','동두천시','가평군','연천군','양주시','의정부시','고양시','과천시','부천시','오산시','포천시'],
  '강원도': ['춘천시','원주시','강릉시','동해시','태백시','속초시','삼척시','홍천군','횡성군','영월군','평창군','정선군','철원군','화천군','양구군','인제군','고성군','양양군'],
  '충청북도': ['청주시','충주시','제천시','보은군','옥천군','영동군','증평군','진천군','괴산군','음성군','단양군'],
  '충청남도': ['천안시','공주시','보령시','아산시','서산시','논산시','계룡시','당진시','금산군','부여군','서천군','청양군','홍성군','예산군','태안군'],
  '전라북도': ['전주시','군산시','익산시','정읍시','남원시','김제시','완주군','진안군','무주군','장수군','임실군','순창군','고창군','부안군'],
  '전라남도': ['목포시','여수시','순천시','나주시','광양시','담양군','곡성군','구례군','고흥군','보성군','화순군','장흥군','강진군','해남군','영암군','무안군','함평군','영광군','장성군','완도군','진도군','신안군'],
  '경상북도': ['포항시','경주시','김천시','안동시','구미시','영주시','영천시','상주시','문경시','경산시','군위군','의성군','청송군','영양군','영덕군','청도군','고령군','성주군','칠곡군','예천군','봉화군','울진군','울릉군'],
  '경상남도': ['창원시','진주시','통영시','사천시','김해시','밀양시','거제시','양산시','의령군','함안군','창녕군','고성군','남해군','하동군','산청군','함양군','거창군','합천군'],
  '제주특별자치도': ['제주시','서귀포시'],
};

const ALL_REGIONS = Object.entries(KOREA_REGIONS).flatMap(([province, cities]) =>
  cities.length === 0 ? [province] : [province, ...cities.map((c) => `${province} ${c}`)]
);

interface Props {
  visible: boolean;
  value: string;
  onSelect: (r: string) => void;
  onClose: () => void;
}

export function RegionSelectorModal({ visible, value, onSelect, onClose }: Props) {
  const [search, setSearch] = useState('');
  const filtered = search ? ALL_REGIONS.filter((r) => r.includes(search)) : ALL_REGIONS;

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <TouchableOpacity style={styles.overlay} onPress={onClose} activeOpacity={1}>
        <TouchableOpacity activeOpacity={1} style={styles.sheet}>
          <View style={styles.handle} />
          <Text style={styles.title}>지역 선택</Text>
          <TextInput
            style={styles.search}
            value={search}
            onChangeText={setSearch}
            placeholder="지역 검색 (예: 수원, 경기)"
            placeholderTextColor={Colors.textLight}
            autoFocus
          />
          <FlatList
            data={filtered}
            keyExtractor={(item) => item}
            style={{ maxHeight: 350 }}
            keyboardShouldPersistTaps="handled"
            renderItem={({ item }) => (
              <TouchableOpacity
                style={[styles.item, value === item && styles.itemSelected]}
                onPress={() => { onSelect(item); onClose(); }}
              >
                <Text style={[styles.itemText, value === item && styles.itemTextSelected]}>{item}</Text>
                {value === item && <Text style={{ color: Colors.primary, fontWeight: '700' }}>✓</Text>}
              </TouchableOpacity>
            )}
          />
          <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
            <Text style={styles.closeBtnText}>취소</Text>
          </TouchableOpacity>
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: Colors.surface, borderTopLeftRadius: Radius.xl, borderTopRightRadius: Radius.xl,
    padding: Spacing.lg, paddingBottom: Spacing.xl, maxHeight: '80%',
  },
  handle: { width: 40, height: 4, borderRadius: 2, backgroundColor: Colors.border, alignSelf: 'center', marginBottom: Spacing.md },
  title: { ...Typography.h3, marginBottom: Spacing.md },
  search: {
    backgroundColor: Colors.background, borderRadius: Radius.md, padding: 12,
    fontSize: 15, color: Colors.text, borderWidth: 1, borderColor: Colors.border, marginBottom: Spacing.sm,
  },
  item: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingVertical: 13, borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  itemSelected: { backgroundColor: Colors.primaryUltraLight, marginHorizontal: -Spacing.lg, paddingHorizontal: Spacing.lg },
  itemText: { ...Typography.body },
  itemTextSelected: { color: Colors.primaryDark, fontWeight: '600' },
  closeBtn: {
    marginTop: Spacing.md, backgroundColor: Colors.background, borderRadius: Radius.md,
    paddingVertical: 12, alignItems: 'center', borderWidth: 1, borderColor: Colors.border,
  },
  closeBtnText: { color: Colors.textSub, fontWeight: '600' },
});
