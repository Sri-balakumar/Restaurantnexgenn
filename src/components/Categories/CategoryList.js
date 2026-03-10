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
        <TouchableOpacity onPress={onPress} style={styles.container}>
            {imageLoading && <ActivityIndicator size="small" color={'black'} style={{ position: 'absolute', top: 30 }} />}
            <Image
                source={imageUri ? { uri: imageUri } : errorImage}
                style={styles.image}
                onLoad={() => setImageLoading(false)}
                onError={() => setImageLoading(false)}
            />
            <View style={{ height: 8 }} />
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
        margin: 6,
        borderWidth: 0.5,
        borderRadius: 10,
        marginTop: 5,
        borderColor: 'grey',
        backgroundColor: "white",
        paddingVertical: 10,
        minHeight: 140,
    },
    image: {
        width: 84,
        height: 84,
        resizeMode: 'contain',
        borderRadius: 8,
        marginTop: 6,
    },
    textContainer: {
        // place text below image
        justifyContent: 'center',
        alignItems: 'center',
        paddingTop: 10,
    },
    name: {
        fontSize: 14,
        textAlign: 'center',
        textTransform: 'capitalize',
        color: '#1316c5ff',
        fontFamily: FONT_FAMILY.urbanistBold
    },
});
