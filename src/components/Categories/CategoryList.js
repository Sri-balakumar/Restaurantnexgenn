import React, { useState, useEffect } from 'react';
import { View, StyleSheet, Image, ActivityIndicator, TouchableOpacity } from 'react-native';
import Text from '@components/Text';
import { FONT_FAMILY } from '@constants/theme';

const CategoryList = ({ item, onPress }) => {

    const errorImage = require('@assets/images/error/error.png');
    useEffect(() => {
        const timeout = setTimeout(() => {
            // Stop the loading indicator after a timeout (e.g., 10 seconds)
            setImageLoading(false);
        }, 10000); // Adjust the timeout as needed

        return () => clearTimeout(timeout);
    }, []);

    const [imageLoading, setImageLoading] = useState(true);
    const title = item?.category_name || item?.name || item?.category || '';
    const truncatedName = title.length > 15 ? title.substring(0, 14) + '...' : title;
    // Prefer inline/base64 or direct image URL returned by API (`image`), fallback to `image_url` for older mappings
    const imageUri = item?.image || item?.image_url || null;

    return (
        <TouchableOpacity onPress={onPress} style={styles.container} activeOpacity={0.75}>
            <View style={styles.imageWrapper}>
                {imageLoading && <ActivityIndicator size="small" color="#2E294E" style={{ position: 'absolute' }} />}
                <Image
                    source={imageUri ? { uri: imageUri } : errorImage}
                    style={styles.image}
                    onLoad={() => setImageLoading(false)}
                    onError={() => setImageLoading(false)}
                />
            </View>
            <View style={styles.textContainer}>
                <Text numberOfLines={2} style={styles.name}>{truncatedName}</Text>
            </View>
        </TouchableOpacity>
    );
};

export default CategoryList;

const styles = StyleSheet.create({
    container: {
        flex: 1,
        alignItems: 'center',
        margin: 5,
        borderRadius: 14,
        marginTop: 5,
        backgroundColor: '#fff',
        paddingVertical: 12,
        paddingHorizontal: 4,
        minHeight: 140,
        elevation: 3,
        shadowColor: '#000',
        shadowOpacity: 0.08,
        shadowRadius: 6,
        shadowOffset: { width: 0, height: 2 },
    },
    imageWrapper: {
        width: 78,
        height: 78,
        borderRadius: 39,
        backgroundColor: '#f0f4ff',
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: 4,
        overflow: 'hidden',
    },
    image: {
        width: 68,
        height: 68,
        resizeMode: 'cover',
        borderRadius: 34,
    },
    textContainer: {
        justifyContent: 'center',
        alignItems: 'center',
        paddingTop: 8,
        paddingHorizontal: 4,
    },
    name: {
        fontSize: 12,
        textAlign: 'center',
        textTransform: 'capitalize',
        color: '#2E294E',
        fontFamily: FONT_FAMILY.urbanistBold,
        lineHeight: 16,
    },
});
