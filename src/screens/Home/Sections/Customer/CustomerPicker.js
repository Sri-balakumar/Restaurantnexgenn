import React, { useState, useEffect } from 'react';
import { View, Text, Modal, FlatList, TouchableOpacity, TextInput, ActivityIndicator } from 'react-native';
import { fetchCustomersOdoo } from '@api/services/generalApi';

const CustomerPicker = ({ visible, onClose, onSelect }) => {
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [customers, setCustomers] = useState([]);

  useEffect(() => {
    if (visible) {
      loadCustomers();
    }
  }, [visible]);

  const loadCustomers = async (searchText = '') => {
    setLoading(true);
    try {
      const result = await fetchCustomersOdoo({ searchText, limit: 50 });
      setCustomers(result);
    } catch (e) {
      setCustomers([]);
    }
    setLoading(false);
  };

  const handleSearch = (text) => {
    setSearch(text);
    loadCustomers(text);
  };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: '#fff', padding: 16 }}>
        <Text style={{ fontSize: 20, fontWeight: 'bold', marginBottom: 12 }}>Select Customer</Text>
        <TextInput
          placeholder="Search by name or phone"
          value={search}
          onChangeText={handleSearch}
          style={{ borderWidth: 1, borderColor: '#ccc', borderRadius: 8, padding: 8, marginBottom: 12 }}
        />
        {loading ? (
          <ActivityIndicator size="large" style={{ marginTop: 20 }} />
        ) : (
          <FlatList
            data={customers}
            keyExtractor={item => String(item.id)}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={{ padding: 12, borderBottomWidth: 1, borderColor: '#eee' }}
                onPress={() => { onSelect(item); onClose(); }}
              >
                <Text style={{ fontWeight: '600' }}>{item.name}</Text>
                <Text style={{ color: '#666' }}>{item.phone || ''}</Text>
              </TouchableOpacity>
            )}
          />
        )}
        <TouchableOpacity onPress={onClose} style={{ marginTop: 20, alignSelf: 'center' }}>
          <Text style={{ color: '#7c3aed', fontWeight: 'bold', fontSize: 16 }}>Cancel</Text>
        </TouchableOpacity>
      </View>
    </Modal>
  );
};

export default CustomerPicker;
