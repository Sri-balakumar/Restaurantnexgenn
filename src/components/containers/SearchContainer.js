import React from 'react';
import { View, Text, TextInput, StyleSheet } from 'react-native';
import { COLORS, FONT_FAMILY } from '@constants/theme';

const SearchContainer = ({ placeholder, onChangeText }) => {
    return (
        <View style={styles.searchContainer}>
            <View style={styles.searchInput}>
                <Text style={styles.searchIcon}>🔍</Text>
                <TextInput
                    style={styles.input}
                    placeholder={placeholder}
                    placeholderTextColor="#888"
                    onChangeText={onChangeText}
                />
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    searchContainer: {
        backgroundColor: COLORS.primaryThemeColor,
        padding: 10,
        paddingHorizontal: 20
    },
    searchInput: {
        backgroundColor: COLORS.white,
        borderRadius: 8,
        padding: 10,
        flexDirection: "row",
        alignItems: 'center',
    },
    searchIcon: {
        marginLeft: 15,
        marginRight: 10,
        fontSize: 18,
    },
    input: {
        flex: 1,
        fontFamily: FONT_FAMILY.urbanistRegular
    },
});

export default SearchContainer;
